using System.Windows;

namespace Discord_clone
{
	public partial class LoginWindow : Window
	{
		public LoginWindow()
		{
			InitializeComponent();
		}

		// Obsługa checkboxa 18+
		private void AgeCheckBox_Click(object sender, RoutedEventArgs e)
		{
			// blokujemy ręczne zaznaczenie
			AgeCheckBox.IsChecked = false;

			// Otwieramy okno weryfikacji
			MainWindow verifyWindow = new MainWindow();

			bool? result = verifyWindow.ShowDialog();

			if (result == true)
			{
				AgeCheckBox.IsChecked = true;
			}
			else
			{
				MessageBox.Show("Weryfikacja wieku nie powiodła się!");
			}
		}

		
		private void RegisterLoginButton_Click(object sender, RoutedEventArgs e)
		{
			
			if (string.IsNullOrWhiteSpace(NickInput.Text) ||
				string.IsNullOrWhiteSpace(EmailInput.Text) ||
				string.IsNullOrWhiteSpace(PasswordInput.Password) ||
				string.IsNullOrWhiteSpace(PasswordRepeatInput.Password))
			{
				MessageBox.Show("Wypełnij wszystkie pola!");
				return;
			}

			
			if (PasswordInput.Password != PasswordRepeatInput.Password)
			{
				MessageBox.Show("Hasła nie są takie same!");
				return;
			}
			if (!(PasswordInput.Password.Any(char.IsUpper)) )
			{
				MessageBox.Show("Hasło musi zawierać minimum 1 dużą literę");
				return;
			}
			if(!(PasswordInput.Password.Any(char.IsLower)))
			{
				MessageBox.Show("Hasło musi zawierać minimum 1 małą literę");
				return;
			}
			
			if (!(PasswordInput.Password.Length >= 8))
			{
				MessageBox.Show("Hasło musi mieć minimum 8 znaków");
				return;
			}


			// Sprawdzenie czy 18+ zostało zaznaczone
			if (AgeCheckBox.IsChecked != true)
			{
				MessageBox.Show("Musisz potwierdzić ukończenie 18 lat!");
				return;
			}

			// Wszystko w porządku → otwieramy SuccessWindow
			SuccessWindow success = new SuccessWindow();
			
			success.ShowDialog();
			this.Close();
		}
	}
}